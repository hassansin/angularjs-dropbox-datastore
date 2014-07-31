<?php
$base_url = (@$_SERVER['HTTPS'] ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] .'/';
$download_folder = 'dl/';

if(isset($_GET['f']) && isset($_GET['t'])){
	$file = $download_folder.$_GET['f'].'.docx';
	$title = $_GET['t'].'.docx';
	header('Content-Description: File Transfer');
	header('Content-Type: application/octet-stream');
	header("Content-Disposition: attachment; filename=$title");
	header('Content-Transfer-Encoding: binary');
	header('Expires: 0');
	header('Cache-Control: must-revalidate');
	header('Pragma: public');
	header('Content-Length: ' . filesize($file));
	ob_clean();
	flush();
	readfile($file);	
	exit;
}
//prepare data
$data = json_decode(file_get_contents('php://input'));
$case_date = date('m/d/Y',strtotime($data->case->activity_date));
$case_id = $data->id;
$case = $data->case;
$activities = $data->activities;
$title = $case->case_no.' '.$case->client.' ('.$case_date.')';

require_once 'PhpWord/src/PhpWord/Autoloader.php';
\PhpOffice\PhpWord\Autoloader::register();

$phpWord = new \PhpOffice\PhpWord\PhpWord();
$phpWord->setDefaultFontName('Cambria');
$phpWord->setDefaultFontSize(12);

$properties = $phpWord->getDocumentProperties();
$properties->setCreator('TimeLineSync');
$properties->setCompany('TimeLineSync');
$properties->setTitle($title);
$properties->setDescription($title);

$paragraphStyle = array('spaceAfter'=>0);

$section = $phpWord->addSection();

$section->addText('Client: '.$data->case->client,null,$paragraphStyle);
$section->addText('Case: '.$data->case->case_no,null,$paragraphStyle);
$section->addText('Subject: '.$data->case->first_name.' '.$data->case->last_name,null,$paragraphStyle);
$section->addText('Date: '.$case_date,null,$paragraphStyle);
$section->addTextBreak(1);


$styleTable = array('borderSize' => 6,'cellMarginLeft' => 80,'cellMarginRight' => 80,'cellMarginBottom' => 0,'cellMarginTop' => 0);
$styleFirstRow = array('bgColor' => 'E0E0E0');
$styleCell = array('borderSize'=>6);
$fontStyle = array('bold' => true, 'align' => 'center');
$phpWord->addTableStyle('Table', $styleTable, $styleFirstRow);
$table = $section->addTable('Table');

//header
$table->addRow();
$table->addCell(1641,$styleCell)->addText('Time',$fontStyle);
$table->addCell(6883,$styleCell)->addText('Activity',$fontStyle);

for($i=0; $i<count($activities); $i++){
	$table->addRow();
	$table->addCell(1641,$styleCell)->addText(date('h:i a',strtotime($activities[$i]->activity_time)),null,$paragraphStyle);
	$table->addCell(6883,$styleCell)->addText($activities[$i]->activity,null,$paragraphStyle);
	$table->addRow();
	$table->addCell(1641,$styleCell)->addText('',null,$paragraphStyle);
	$table->addCell(6883,$styleCell)->addText('',null,$paragraphStyle);
}



// Finally, write the document:
$objWriter = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
$file = md5($case_id);
$objWriter->save($download_folder.$file.'.docx');

echo json_encode(array('success'=>true,'file'=>$file,'title'=> $title,'url'=> $base_url . 'download.php?f='.urlencode($file).'&t='.urlencode($title) ));


